/*
   ____ __     ______
  / ___|\ \   / / ___|
  \___ \ \ \ / / |  _
   ___) | \ V /| |_| |
  |____/   \_/  \____|

  SVG for C++ v0.3.0

  https://github.com/vincentlaucsb/svg

  Copyright (c) 2018-2026 Vincent La
  SPDX-License-Identifier: MIT

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
*/

/** @file */
#pragma once
#define PI 3.14159265
#define RAD_TO_DEG (180/PI)
#define SVG_TYPE_CHECK static_assert(std::is_base_of<Element, T>::value, "Child must be an SVG element.")
#define APPROX_EQUALS(x, y, tol) bool(abs(x - y) < tol)
#include <iostream>
#include <algorithm> // min, max
#include <cctype>
#include <fstream>   // ofstream
#include <functional>
#include <math.h>    // NAN
#include <map>
#include <deque>
#include <vector>
#include <string>
#include <sstream> // stringstream
#include <iomanip> // setprecision
#include <memory>
#include <stdexcept>
#include <type_traits> // is_base_of
#include <utility>

namespace SVGPP {
    /** @namespace SVG
     *  @brief Main namespace for SVG for C++
     */
    class AttributeMap;
    class SVG;
    class Shape;
    class Symbol;
    class Use;

    enum class ElementKind {
        Custom,
        Defs,
        Symbol,
        Use,
        SVG,
        Style,
        Path,
        Text,
        Group,
        Line,
        Rect,
        Circle,
        Polygon
    };

    inline std::string tag_name(ElementKind kind) {
        switch (kind) {
            case ElementKind::Defs: return "defs";
            case ElementKind::Symbol: return "symbol";
            case ElementKind::Use: return "use";
            case ElementKind::SVG: return "svg";
            case ElementKind::Style: return "style";
            case ElementKind::Path: return "path";
            case ElementKind::Text: return "text";
            case ElementKind::Group: return "g";
            case ElementKind::Line: return "line";
            case ElementKind::Rect: return "rect";
            case ElementKind::Circle: return "circle";
            case ElementKind::Polygon: return "polygon";
            case ElementKind::Custom: return "";
        }
        return "";
    }

    struct QuadCoord {
        double x1;
        double x2;
        double y1;
        double y2;
    };

    /** A mapping of CSS selectors to their corresponding style attributes */
    using SelectorProperties = std::map<std::string, AttributeMap>;
    using SVGAttrib = std::map<std::string, std::string>;
    using Point = std::pair<double, double>;
    using Margins = QuadCoord;
    const static Margins DEFAULT_MARGINS = { 10, 10, 10, 10 };
    const static Margins NO_MARGINS = { 0, 0, 0, 0 };

#if __cplusplus < 201402L
    namespace detail {
        template<typename T, typename... Args>
        std::unique_ptr<T> make_unique(Args&&... args) {
            return std::unique_ptr<T>(new T(std::forward<Args>(args)...));
        }
    }
#else
    namespace detail {
        using std::make_unique;
    }
#endif

    inline std::string to_string(const double& value);
    inline std::string to_string(const Point& point);
    inline std::string to_string(const std::map<std::string, AttributeMap>& css, const size_t indent_level=0);
    inline std::string escape_xml(const std::string& text);

    std::vector<Point> bounding_polygon(const std::vector<Shape*>& shapes);
    SVG frame_animate(std::vector<SVG>& frames, const double fps);
    SVG merge(SVG& left, SVG& right, const Margins& margins = DEFAULT_MARGINS);
    SVG merge(std::vector<SVG>& frames, const double width, const int max_frame_width);

    /** @class ClassList
     *  @brief Ordered token list for managing the class attribute
     */
    class ClassList {
    public:
        ClassList() = default;
        explicit ClassList(std::string& value) : mutable_value_(&value), value_(&value) {}
        explicit ClassList(const std::string& value) : value_(&value) {}

        /** Return true when the class token exists */
        bool contains(const std::string& token) const {
            validate_token(token);
            const auto values = tokens();
            return std::find(values.begin(), values.end(), token) != values.end();
        }

        /** Add a class token if it does not already exist */
        ClassList& add(const std::string& token) {
            validate_token(token);
            auto values = tokens();
            if (std::find(values.begin(), values.end(), token) == values.end()) {
                values.push_back(token);
                write(values);
            }
            return *this;
        }

        /** Remove a class token if it exists */
        ClassList& remove(const std::string& token) {
            validate_token(token);
            auto values = tokens();
            const auto original_size = values.size();
            values.erase(std::remove(values.begin(), values.end(), token), values.end());
            if (values.size() != original_size) {
                write(values);
            }
            return *this;
        }

        /** Add a missing token or remove an existing token, returning true when present */
        bool toggle(const std::string& token) {
            if (contains(token)) {
                remove(token);
                return false;
            }

            add(token);
            return true;
        }

        /** Replace the class attribute with a whitespace-normalized token list */
        ClassList& set(const std::string& class_names) {
            write(parse(class_names));
            return *this;
        }

        /** Remove all classes */
        ClassList& clear() {
            write({});
            return *this;
        }

        /** Return normalized class text */
        std::string str() const {
            return join(tokens());
        }

        /** Return the current tokens in order */
        std::vector<std::string> tokens() const {
            return parse(value());
        }

    private:
        static bool is_space(char ch) {
            return std::isspace(static_cast<unsigned char>(ch)) != 0;
        }

        static void validate_token(const std::string& token) {
            if (token.empty()) {
                throw std::invalid_argument("class token cannot be empty");
            }
            if (std::find_if(token.begin(), token.end(), is_space) != token.end()) {
                throw std::invalid_argument("class token cannot contain whitespace");
            }
        }

        static std::vector<std::string> parse(const std::string& class_names) {
            std::vector<std::string> result;
            std::string token;
            for (const auto ch : class_names) {
                if (is_space(ch)) {
                    if (!token.empty()) {
                        if (std::find(result.begin(), result.end(), token) == result.end()) {
                            result.push_back(token);
                        }
                        token.clear();
                    }
                    continue;
                }
                token.push_back(ch);
            }
            if (!token.empty() && std::find(result.begin(), result.end(), token) == result.end()) {
                result.push_back(token);
            }
            return result;
        }

        static std::string join(const std::vector<std::string>& values) {
            std::string result;
            for (std::size_t i = 0; i < values.size(); ++i) {
                if (i > 0) {
                    result += ' ';
                }
                result += values[i];
            }
            return result;
        }

        const std::string& value() const {
            static const std::string empty;
            return value_ ? *value_ : empty;
        }

        void write(const std::vector<std::string>& values) {
            if (!mutable_value_) {
                throw std::logic_error("cannot mutate a const class list");
            }
            *mutable_value_ = join(values);
            value_ = mutable_value_;
        }

        std::string* mutable_value_ = nullptr;
        const std::string* value_ = nullptr;
    };

    /** @class TransformList
     *  @brief Ordered function list for managing the transform attribute
     */
    class TransformList {
    public:
        TransformList() = default;
        explicit TransformList(std::string& value) : mutable_value_(&value), value_(&value) {}
        explicit TransformList(const std::string& value) : value_(&value) {}

        /** Append a raw transform function or function list */
        TransformList& append(const std::string& transform) {
            validate_appendable();
            if (transform.empty()) {
                throw std::invalid_argument("transform cannot be empty");
            }

            if (str().empty() || str() == "none") {
                write(transform);
            } else {
                write(str() + " " + transform);
            }
            return *this;
        }

        /** Replace the transform attribute */
        TransformList& set(const std::string& transform) {
            write(transform);
            return *this;
        }

        /** Remove all transforms */
        TransformList& clear() {
            write("");
            return *this;
        }

        TransformList& matrix(double a, double b, double c, double d, double e, double f) {
            std::stringstream ss;
            ss << "matrix(" << to_string(a) << " " << to_string(b) << " " << to_string(c)
               << " " << to_string(d) << " " << to_string(e) << " " << to_string(f) << ")";
            return append(ss.str());
        }

        TransformList& translate(double x) {
            return append("translate(" + to_string(x) + ")");
        }

        TransformList& translate(double x, double y) {
            return append("translate(" + to_string(x) + " " + to_string(y) + ")");
        }

        TransformList& scale(double factor) {
            return append("scale(" + to_string(factor) + ")");
        }

        TransformList& scale(double x, double y) {
            return append("scale(" + to_string(x) + " " + to_string(y) + ")");
        }

        TransformList& rotate(double degrees) {
            return append("rotate(" + to_string(degrees) + ")");
        }

        TransformList& rotate(double degrees, double cx, double cy) {
            return append("rotate(" + to_string(degrees) + " " + to_string(cx) + " " +
                          to_string(cy) + ")");
        }

        TransformList& skew_x(double degrees) {
            return append("skewX(" + to_string(degrees) + ")");
        }

        TransformList& skew_y(double degrees) {
            return append("skewY(" + to_string(degrees) + ")");
        }

        /** Return the current transform text */
        std::string str() const {
            return value();
        }

    private:
        static bool is_keyword(const std::string& transform) {
            return transform == "inherit" || transform == "initial" || transform == "revert" ||
                   transform == "revert-layer" || transform == "unset";
        }

        const std::string& value() const {
            static const std::string empty;
            return value_ ? *value_ : empty;
        }

        void validate_appendable() const {
            if (is_keyword(value())) {
                throw std::logic_error("cannot append transform functions to a transform keyword");
            }
        }

        void write(const std::string& value) {
            if (!mutable_value_) {
                throw std::logic_error("cannot mutate a const transform list");
            }
            *mutable_value_ = value;
            value_ = mutable_value_;
        }

        std::string* mutable_value_ = nullptr;
        const std::string* value_ = nullptr;
    };

    /** @namespace util
     *  @brief Various utility and mathematical functions
     */
    namespace util {
        enum Orientation {
            COLINEAR, CLOCKWISE, COUNTERCLOCKWISE
        };

        inline std::vector<Point> polar_points(int n, int a, int b, double radius);
        
        template<typename T>
        inline T min_or_not_nan(T first, T second) {
            /** Return the smallest number or the number that is not NAN
             *  Returns NAN if both are NAN
             */
            if (isnan(first) && isnan(second))
                return NAN;
            else if (isnan(first) || isnan(second))
                return isnan(first) ? second : first;
            else
                return std::min(first, second);
        }

        template<typename T>
        inline T max_or_not_nan(T first, T second) {
            /** Return the largest number or the number that is not NAN
            *  Returns NAN if both are NAN
            */
            if (isnan(first) && isnan(second))
                return NAN;
            else if (isnan(first) || isnan(second))
                return isnan(first) ? second : first;
            else
                return std::max(first, second);
        }

        inline Orientation orientation(Point& p1, Point& p2, Point& p3) {
            double value = ((p2.second - p1.second) * (p3.first - p2.first) -
                (p2.first - p1.first) * (p3.second - p2.second));
            
            if (value == 0) return COLINEAR;
            else if (value > 0) return CLOCKWISE;
            else return COUNTERCLOCKWISE;
        }

        inline std::vector<Point> convex_hull(std::vector<Point>& points) {
            /** Compute the convex hull of a set of points via Jarvis'
             *  gift wrapping algorithm
             *
             *  Ref: https://www.geeksforgeeks.org/convex-hull-set-1-jarviss-algorithm-or-wrapping/
             */

            if (points.size() < 3) return {}; // Need at least three points
            std::vector<Point> hull;

            // Find leftmost point (ties don't matter)
            int left = 0;
            for (size_t i = 0; i < points.size(); i++)
                if (points[i].first < points[left].first) left = (int)i;
            
            // While we don't reach leftmost point
            int current = left, next;
            do {
                // Add to convex hull
                hull.push_back(points[current]);

                // Keep moving counterclockwise
                next = (current + 1) % points.size();
                for (size_t i = 0; i < points.size(); i++) {
                    // We've found a more counterclockwise point --> update next
                    if (orientation(points[current], points[next], points[i]) == COUNTERCLOCKWISE)
                        next = (int)i;
                }

                current = next;
            } while (current != left);

            return hull;
        }

        inline std::vector<Point> polar_points(int n, int a, int b, double radius) {
            /** Return n equidistant points (oriented counterclockwise) located on
             *  the perimeter of a circle of radius r centered at (a, b)  
             *
             *  Note: Drawing an edge between each consecutive pair of points creates
             *  a convex polygon
             */
            std::vector<Point> ret;
            for (double degree = 0; degree < 360; degree += 360.0/n) {
                ret.push_back(Point(
                    a + radius * cos(degree * (PI/180)), // 1 degree = pi/180 radians
                    b + radius * sin(degree * (PI/180))
                ));
            }

            return ret;
        }
    }

    inline std::string to_string(const double& value) {
        /** Trim off all but one decimal place when converting a double to string */
        std::stringstream ss;
        ss << std::fixed << std::setprecision(5);
        ss << value;
        return ss.str();
    }

    inline std::string to_string(const Point& point) {
        /** Return a string representation of a point as "x,y" */
        return to_string(point.first) + "," + to_string(point.second);
    }

    inline std::string escape_xml(const std::string& text) {
        std::string out;
        out.reserve(text.size());
        for (const char ch : text) {
            switch (ch) {
                case '&':
                    out += "&amp;";
                    break;
                case '<':
                    out += "&lt;";
                    break;
                case '>':
                    out += "&gt;";
                    break;
                case '"':
                    out += "&quot;";
                    break;
                case '\'':
                    out += "&apos;";
                    break;
                default:
                    out.push_back(ch);
                    break;
            }
        }
        return out;
    }

    /** @class AttributeMap
     *  @brief Base class for anything that has attributes (e.g. SVG elements, CSS stylesheets)
     */
    class AttributeMap {
    public:
        struct AttrSetter {
            AttrSetter(SVGAttrib::mapped_type& _attr,
                       bool _normalize_class = false,
                       std::function<void(const std::string&)> _on_update = {}) :
                    attr_(_attr), normalize_class_(_normalize_class), on_update_(_on_update) {};

            template<typename T>
            AttrSetter& operator<<(T value) {
                attr_ += std::to_string(value);
                normalize();
                notify();
                return *this;
            }

        private:
            void normalize() {
                if (normalize_class_) {
                    ClassList(attr_).set(attr_);
                }
            }

            void notify() {
                if (on_update_) {
                    on_update_(attr_);
                }
            }

            SVGAttrib::mapped_type& attr_;
            bool normalize_class_ = false;
            std::function<void(const std::string&)> on_update_;
        };

        AttributeMap() = default;
        virtual ~AttributeMap() = default;
        AttributeMap(SVGAttrib _attr) : attr_(std::move(_attr)) {};

        const SVGAttrib& attrs() const {
            return this->attr_;
        }

        bool has_attr(const std::string& key) const {
            return this->attr_.find(key) != this->attr_.end();
        }

        std::string get_attr(const std::string& key, const std::string& fallback = "") const {
            const auto found = this->attr_.find(key);
            return found == this->attr_.end() ? fallback : found->second;
        }

        template<typename T>
        AttributeMap& set_attr(const std::string key, T value) {
            this->set_attr_value(key, std::to_string(value));
            return *this;
        }

        /** Set multiple attributes at once */
        AttributeMap& set_attrs(std::initializer_list<std::pair<std::string, std::string>> values) {
            for (const auto& pair : values) {
                this->set_attr_value(pair.first, pair.second);
            }

            return *this;
        }

        AttrSetter set_attr(const std::string key) {
            return this->make_attr_setter(key);
        };

        ClassList class_list() {
            return ClassList(this->attr_["class"]);
        }

        ClassList class_list() const {
            const auto found = this->attr_.find("class");
            return found == this->attr_.end() ? ClassList() : ClassList(found->second);
        }

        TransformList transform_list() {
            return TransformList(this->attr_["transform"]);
        }

        TransformList transform_list() const {
            const auto found = this->attr_.find("transform");
            return found == this->attr_.end() ? TransformList() : TransformList(found->second);
        }

        TransformList transform() {
            return transform_list();
        }

        TransformList transform() const {
            return transform_list();
        }

    protected:
        virtual void set_attr_value(const std::string& key, const std::string& value) {
            if (key == "class") {
                ClassList(this->attr_[key]).set(value);
                return;
            }
            this->attr_[key] = value;
        }

        virtual AttrSetter make_attr_setter(const std::string& key) {
            if (this->attr_.find(key) == this->attr_.end()) this->attr_[key] = "";
            return AttrSetter(this->attr_.at(key), key == "class");
        }

        SVGAttrib& mutable_attrs() {
            return this->attr_;
        }

    private:
        SVGAttrib attr_;
    };

    template<>
    inline AttributeMap::AttrSetter& AttributeMap::AttrSetter::operator<<(const char * value) {
        attr_ += value;
        normalize();
        notify();
        return *this;
    }

    template<>
    inline AttributeMap::AttrSetter& AttributeMap::AttrSetter::operator<<(const std::string value) {
        attr_ += value;
        normalize();
        notify();
        return *this;
    }

    template<>
    inline AttributeMap& AttributeMap::set_attr(const std::string key, const double value) {
        /** Modify the attribute specified by key */
        this->set_attr_value(key, to_string(value));
        return *this;
    }

    template<>
    inline AttributeMap& AttributeMap::set_attr(const std::string key, const char * value) {
        /** Modify the attribute specified by key */
        this->set_attr_value(key, value);
        return *this;
    }

    template<>
    inline AttributeMap& AttributeMap::set_attr(const std::string key, const std::string value) {
        /** Modify the attribute specified by key */
        this->set_attr_value(key, value);
        return *this;
    }

    /** @class Element
     *  @brief Abstract base class for all SVG elements
     */
    class Element: public AttributeMap {
    public:
        /** @class BoundingBox
         *  @brief Represents the top left and bottom right corners of a bounding rectangle
         */
        class BoundingBox : public QuadCoord {
        public:
            using QuadCoord::QuadCoord;
            BoundingBox() = default;
            BoundingBox(double a, double b, double c, double d) : QuadCoord({ a, b, c, d }) {};

            BoundingBox operator+ (const BoundingBox& other) {
                /** Return a new bounding box which envelopes both original boxes */
                using namespace util;
                BoundingBox new_box;
                new_box.x1 = min_or_not_nan(this->x1, other.x1);
                new_box.x2 = max_or_not_nan(this->x2, other.x2);
                new_box.y1 = min_or_not_nan(this->y1, other.y1);
                new_box.y2 = max_or_not_nan(this->y2, other.y2);
                return new_box;
            }
        };
        using ChildList = std::vector<Element*>;
        using ChildMap = std::map<std::string, ChildList>;

        Element() = default;
        virtual ~Element() = default;
        Element(const Element& other) = delete; // No copy constructor
        Element(Element&& other) noexcept :
                AttributeMap(std::move(other)),
                children(std::move(other.children)),
                parent_(nullptr),
                owner_(nullptr),
                indexed_id_() {
            reparent_children();
        }
        Element& operator=(const Element&) = delete; // No copy assignment
        Element& operator=(Element&& other) noexcept {
            if (this != &other) {
                AttributeMap::operator=(std::move(other));
                children = std::move(other.children);
                parent_ = nullptr;
                owner_ = nullptr;
                indexed_id_.clear();
                reparent_children();
            }
            return *this;
        }

        Element(const char* id) : AttributeMap(
            SVGAttrib({ { "id", id } })) {};
        using AttributeMap::AttributeMap;

        // Implicit string conversion
        operator std::string() { return this->svg_to_string(0); };

        template<typename T, typename... Args>
        T* add_child(Args&&... args) {
            /** Add an SVG element as a child and return a pointer to the element added */
            SVG_TYPE_CHECK;
            auto child = detail::make_unique<T>(std::forward<Args>(args)...);
            return static_cast<T*>(this->insert_child(std::move(child), this->children.end()));
        }

        template<typename T>
        Element& operator<<(T&& node) {
            /** Move an SVG element into this container */
            SVG_TYPE_CHECK;
            auto child = detail::make_unique<T>(std::move(node));
            this->insert_child(std::move(child), this->children.end());
            return *this;
        }

        template<typename T>
        std::vector<T*> get_children() {
            /** Return all children of type T */
            SVG_TYPE_CHECK;
            std::vector<T*> ret;
            auto child_elems = this->get_children_helper();
            
            for (auto& child: child_elems)
                if (child->kind() == T::static_kind) ret.push_back(static_cast<T*>(child));

            return ret;
        }

        template<typename T>
        std::vector<T*> get_immediate_children() {
            /** Return all immediate children of type T */
            SVG_TYPE_CHECK;
            std::vector<T*> ret;
            for (auto& child : this->children) {
                if (child->kind() == T::static_kind) ret.push_back(static_cast<T*>(child.get()));
            }

            return ret;
        }

        Element* get_element_by_id(const std::string& id);
        std::vector<Element*> get_elements_by_class(const std::string& clsname);
        const Element* parent() const { return parent_; }
        virtual ElementKind kind() const = 0;
        Element& id(const std::string& value);
        std::string id() const;
        void autoscale(const Margins& margins=DEFAULT_MARGINS);
        void autoscale(const double margin);
        virtual BoundingBox get_bbox();
        ChildMap get_children();

    protected:
        std::vector<std::unique_ptr<Element>> children; /** Smart pointers to child elements */
        using ChildIterator = std::vector<std::unique_ptr<Element>>::iterator;
        std::vector<Element*> get_children_helper();
        void get_bbox(Element::BoundingBox&);
        virtual std::string svg_to_string(const size_t indent_level); /** SVG string corresponding to this element */
        virtual std::string tag() { return tag_name(this->kind()); } /** The SVG tag of this element */

        void set_attr_value(const std::string& key, const std::string& value) override;
        AttrSetter make_attr_setter(const std::string& key) override;
        SVG* owner_svg();
        const SVG* owner_svg() const;
        void set_owner_svg(SVG* owner);
        void register_subtree_ids();
        void unregister_subtree_ids();
        void register_own_id();
        void unregister_own_id();

        Element* insert_child(std::unique_ptr<Element> child, ChildIterator position) {
            child->parent_ = this;
            child->set_owner_svg(this->owner_svg());
            try {
                child->register_subtree_ids();
            } catch (...) {
                child->unregister_subtree_ids();
                child->set_owner_svg(nullptr);
                child->parent_ = nullptr;
                throw;
            }
            return children.insert(position, std::move(child))->get();
        }

        void reparent_children() {
            for (auto& child : children) {
                child->parent_ = this;
                child->set_owner_svg(this->owner_);
                child->reparent_children();
            }
        }

        double find_numeric(const std::string& key) {
            /** Return the numeric attribute (if it exists) or NAN
             *
             *  @param[in] key Name of the attribute
             */
            if (this->has_attr(key))
                return std::stof(this->get_attr(key));
            return NAN;
        }

    private:
        Element* parent_ = nullptr;
        SVG* owner_ = nullptr;
        std::string indexed_id_;
    };

    template<>
    inline Element::ChildList Element::get_immediate_children() {
        /** Return all immediate children, regardless of type, as Element pointers */
        Element::ChildList ret;
        for (auto& child : this->children) ret.push_back(child.get());
        return ret;
    }

    inline Element* Element::get_element_by_id(const std::string &id) {
        /** Return the SVG element that has a certain id */
        auto child_elems = this->get_children_helper();
        for (auto& current: child_elems)
            if (current->id() == id) return current;
        
        return nullptr;
    }

    inline std::vector<Element*> Element::get_elements_by_class(const std::string &clsname) {
        /** Return all SVG elements with a certain class name */
        std::vector<Element*> ret;
        auto child_elems = this->get_children_helper();
    
        for (auto& current: child_elems) {
            if (current->has_attr("class")
                && current->class_list().contains(clsname))
                ret.push_back(current);
        }
    
        return ret;
    }

    inline Element::BoundingBox Element::get_bbox() {
        /** Compute the bounding box necessary to contain this element */
        return { NAN, NAN, NAN, NAN };
    }

    /** @class Shape
     *  @brief Base class for any SVG elements that have a width and height
     */
    class Shape: public Element {
    public:
        using Element::Element;

        operator Point() {
            /** Implicit conversion to Point */
            return std::make_pair(this->x(), this->y());
        }

        virtual std::vector<Point> points() {
            /** Return a set of points used for calculating a bounding polygon for this object */
            auto bbox = this->get_bbox();
            return {
                Point(bbox.x1, bbox.y1), // Top left
                Point(bbox.x2, bbox.y1), // Top right
                Point(bbox.x1, bbox.y2), // Bottom left
                Point(bbox.x2, bbox.y2)  // Bottom right
            };
        }

        virtual double x() { return this->find_numeric("x"); }
        virtual double y() { return this->find_numeric("y"); }
        virtual double width() {
            /** Return this item's width, either by calculating it or finding the 
             *  width attribute
             */
            return this->find_numeric("width");
        }
        virtual double height() {
            /** Return this item's height, either by calculating it or finding the
             *  height attribute
             */
            return this->find_numeric("height");
        }
    };

    class Defs : public Element {
    public:
        static constexpr ElementKind static_kind = ElementKind::Defs;
        using Element::Element;
        ElementKind kind() const override { return static_kind; }
        Symbol* symbol(std::string id);
    };

    class Symbol : public Element {
    public:
        static constexpr ElementKind static_kind = ElementKind::Symbol;
        Symbol() = default;
        using Element::Element;

        explicit Symbol(std::string id) {
            this->id(id);
        }

        std::string href() const;
        ElementKind kind() const override { return static_kind; }
        Use use(double x, double y) const;
        Use use(double x, double y, double width, double height) const;
    };

    class Use : public Shape {
    public:
        static constexpr ElementKind static_kind = ElementKind::Use;
        Use() = default;
        using Shape::Shape;

        explicit Use(std::string href) {
            set_attr("href", std::move(href));
        }

        Use(std::string href, double x, double y) : Use(std::move(href)) {
            set_attr("x", x);
            set_attr("y", y);
        }

        Use(std::string href, double x, double y, double width, double height) :
                Use(std::move(href), x, y) {
            set_attr("width", width);
            set_attr("height", height);
        }

        Use& xlink_href(std::string href) {
            set_attr("xlink:href", std::move(href));
            return *this;
        }
        ElementKind kind() const override { return static_kind; }
    };

    class SVG : public Shape {
        friend class Element;

        std::map<std::string, Element*> id_index_;
        Defs* defs_ = nullptr;

    public:
        class Style : public Element {
        public:
            static constexpr ElementKind static_kind = ElementKind::Style;
            Style() = default;
            using Element::Element;
            SelectorProperties css; /**< Basic CSS styling */
            std::map<std::string, SelectorProperties> media_queries; /**< CSS media queries */
            std::map<std::string, SelectorProperties> keyframes; /**< CSS animations */
            ElementKind kind() const override { return static_kind; }

        protected:
            std::string svg_to_string(const size_t) override;
        };

        /**< Create an <svg> with specified attributes */
        static constexpr ElementKind static_kind = ElementKind::SVG;
        SVG(SVGAttrib _attr =
                { { "xmlns", "http://www.w3.org/2000/svg" } }
        ) : Shape(_attr) {
            set_owner_svg(this);
            rebuild_id_index();
        };

        SVG(SVG&& other) noexcept :
                Shape(std::move(other)),
                id_index_(std::move(other.id_index_)),
                defs_(nullptr),
                css(nullptr) {
            refresh_special_children();
            set_owner_svg(this);
            rebuild_id_index();
        }

        SVG& operator=(SVG&& other) noexcept {
            if (this != &other) {
                Shape::operator=(std::move(other));
                id_index_ = std::move(other.id_index_);
                defs_ = nullptr;
                css = nullptr;
                refresh_special_children();
                set_owner_svg(this);
                rebuild_id_index();
            }
            return *this;
        }

        /** Retrieve a handle corresponding to the given CSS selector */
        AttributeMap& style(const std::string& key) { return this->css->css[key]; }

        /** Retrieve a handle corresponding to a selector within a CSS media query */
        AttributeMap& media_style(const std::string& query, const std::string& key) {
            return this->css->media_queries[query][key];
        }

        std::map<std::string, AttributeMap>& keyframes(const std::string& key) {
            /** Add or modify an animation keyframe
             *
             *  @param[in] key The name of the animation
             */
            if (!this->css) this->css = this->add_child<Style>();
            return this->css->keyframes[key];
        }

        Defs* defs() {
            if (!this->defs_) this->defs_ = this->add_child<Defs>();
            return this->defs_;
        }

        template<typename T, typename... Args>
        typename std::enable_if<!std::is_same<T, Defs>::value, T*>::type add_child(Args&&... args) {
            return Element::add_child<T>(std::forward<Args>(args)...);
        }

        template<typename T, typename... Args>
        typename std::enable_if<std::is_same<T, Defs>::value, T*>::type add_child(Args&&... args) {
            if (this->defs_) return this->defs_;

            auto child = detail::make_unique<T>(std::forward<Args>(args)...);
            auto* inserted = static_cast<T*>(
                this->insert_child(std::move(child), this->defs_insert_position()));
            this->defs_ = inserted;
            return inserted;
        }

        Element* get_element_by_id(const std::string& id) {
            const auto found = this->id_index_.find(id);
            return found == this->id_index_.end() ? nullptr : found->second;
        }

        template<typename T>
        T* get_element_by_id(const std::string& id) {
            SVG_TYPE_CHECK;
            auto* element = this->get_element_by_id(id);
            if (!element || element->kind() != T::static_kind) return nullptr;
            return static_cast<T*>(element);
        }

        Style* css = this->add_child<Style>(); /**< This item's associated CSS stylesheet */
        ElementKind kind() const override { return static_kind; }

    protected:

    private:
        void refresh_special_children() {
            this->css = nullptr;
            this->defs_ = nullptr;
            for (auto& child : this->children) {
                if (child->kind() == Style::static_kind) {
                    this->css = static_cast<Style*>(child.get());
                } else if (child->kind() == Defs::static_kind) {
                    this->defs_ = static_cast<Defs*>(child.get());
                }
            }
        }

        void register_id(Element& element, const std::string& id) {
            if (id.empty()) return;
            const auto found = this->id_index_.find(id);
            if (found != this->id_index_.end() && found->second != &element) {
                throw std::invalid_argument("Duplicate SVG element id: " + id);
            }
            this->id_index_[id] = &element;
        }

        void unregister_id(Element& element, const std::string& id) {
            if (id.empty()) return;
            const auto found = this->id_index_.find(id);
            if (found != this->id_index_.end() && found->second == &element) {
                this->id_index_.erase(found);
            }
        }

        void rebuild_id_index() {
            this->id_index_.clear();
            this->register_subtree_ids();
        }

        ChildIterator defs_insert_position() {
            if (!this->css) return this->children.begin();

            for (auto it = this->children.begin(); it != this->children.end(); ++it) {
                if (it->get() == this->css) return it + 1;
            }
            return this->children.begin();
        }

    };

    inline SVG* Element::owner_svg() {
        return this->owner_;
    }

    inline const SVG* Element::owner_svg() const {
        return this->owner_;
    }

    inline void Element::set_owner_svg(SVG* owner) {
        this->owner_ = owner;
        for (auto& child : this->children) {
            child->set_owner_svg(owner);
        }
    }

    inline Element& Element::id(const std::string& value) {
        const auto old_indexed_id = this->indexed_id_;
        auto* root = this->owner_svg();

        if (value.empty()) {
            if (root && !old_indexed_id.empty()) {
                root->unregister_id(*this, old_indexed_id);
            }
            this->mutable_attrs().erase("id");
            this->indexed_id_.clear();
            return *this;
        }

        if (root && old_indexed_id != value) {
            root->register_id(*this, value);
        }
        if (root && !old_indexed_id.empty() && old_indexed_id != value) {
            root->unregister_id(*this, old_indexed_id);
        }

        this->mutable_attrs()["id"] = value;
        this->indexed_id_ = root ? value : "";
        return *this;
    }

    inline std::string Element::id() const {
        return this->get_attr("id");
    }

    inline void Element::set_attr_value(const std::string& key, const std::string& value) {
        if (key == "id") {
            this->id(value);
            return;
        }
        AttributeMap::set_attr_value(key, value);
    }

    inline AttributeMap::AttrSetter Element::make_attr_setter(const std::string& key) {
        if (key != "id") {
            return AttributeMap::make_attr_setter(key);
        }

        this->id("");
        this->mutable_attrs()[key] = "";
        return AttrSetter(this->mutable_attrs().at(key), false, [this](const std::string& value) {
            const auto previous = this->indexed_id_;
            try {
                this->id(value);
            } catch (...) {
                if (previous.empty()) {
                    this->mutable_attrs().erase("id");
                } else {
                    this->mutable_attrs()["id"] = previous;
                }
                throw;
            }
        });
    }

    inline void Element::register_subtree_ids() {
        this->register_own_id();
        for (auto& child : this->children) {
            child->register_subtree_ids();
        }
    }

    inline void Element::unregister_subtree_ids() {
        this->unregister_own_id();
        for (auto& child : this->children) {
            child->unregister_subtree_ids();
        }
    }

    inline void Element::register_own_id() {
        const auto current_id = this->id();
        if (current_id.empty()) return;

        if (auto* root = this->owner_svg()) {
            root->register_id(*this, current_id);
            this->indexed_id_ = current_id;
        }
    }

    inline void Element::unregister_own_id() {
        if (this->indexed_id_.empty()) return;

        if (auto* root = this->owner_svg()) {
            root->unregister_id(*this, this->indexed_id_);
        }
        this->indexed_id_.clear();
    }

    inline Symbol* Defs::symbol(std::string id) {
        for (auto* child : this->get_immediate_children<Symbol>()) {
            if (child->id() == id) return child;
        }
        return this->add_child<Symbol>(std::move(id));
    }

    inline std::string Symbol::href() const {
        const auto symbol_id = this->id();
        if (symbol_id.empty()) {
            throw std::logic_error("SVG symbol must have an id before it can be referenced");
        }
        return "#" + symbol_id;
    }

    inline Use Symbol::use(double x, double y) const {
        return Use(this->href(), x, y);
    }

    inline Use Symbol::use(double x, double y, double width, double height) const {
        return Use(this->href(), x, y, width, height);
    }

    class Path : public Shape {
    public:
        static constexpr ElementKind static_kind = ElementKind::Path;
        using Shape::Shape;
        ElementKind kind() const override { return static_kind; }

        template<typename T>
        inline void start(T x, T y) {
            /** Start line at (x, y)
             *  This function overwrites the current path if it exists
             */
            this->set_attr("d", "M " + std::to_string(x) + " " + std::to_string(y));
            this->x_start = x;
            this->y_start = y;
        }

        template<typename T>
        inline void line_to(T x, T y) {
            /** Draw a line to (x, y)
             *  If line has not been initialized by setting a starting point,
             *  then start() will be called with (x, y) as arguments
             */

            if (!this->has_attr("d"))
                start(x, y);
            else
                this->mutable_attrs()["d"] += " L " + std::to_string(x) +
                                             " " + std::to_string(y);
        }

        inline void line_to(std::pair<double, double> coord) {
            this->line_to(coord.first, coord.second);
        }

        inline void to_origin() {
            /** Draw a line back to the origin */
            this->line_to(x_start, y_start);
        }
    private:
        double x_start;
        double y_start;
    };

    class Text : public Element {
    public:
        static constexpr ElementKind static_kind = ElementKind::Text;
        Text() = default;
        using Element::Element;
        ElementKind kind() const override { return static_kind; }

        Text(double x, double y, std::string _content) {
            set_attr("x", to_string(x));
            set_attr("y", to_string(y));
            content = _content;
        }

        Text(std::pair<double, double> xy, std::string _content) :
                Text(xy.first, xy.second, _content) {};

    protected:
        std::string content;
        std::string svg_to_string(const size_t) override;
    };

    class Group : public Element {
    public:
        static constexpr ElementKind static_kind = ElementKind::Group;
        using Element::Element;
        ElementKind kind() const override { return static_kind; }
    };

    class Line : public Shape {
    public:
        static constexpr ElementKind static_kind = ElementKind::Line;
        Line() = default;
        using Shape::Shape;
        ElementKind kind() const override { return static_kind; }

        Line(double x1, double x2, double y1, double y2) : Shape({
                { "x1", to_string(x1) },
                { "x2", to_string(x2) },
                { "y1", to_string(y1) },
                { "y2", to_string(y2) }
        }) {};

        Line(Point x, Point y) : Line(x.first, y.first, x.second, y.second) {};

        virtual double x() override { return x1() + (x2() - x1()) / 2; }
        virtual double y() override { return y1() + (y2() - y1()) / 2; }
        double x1() { return this->find_numeric("x1"); }
        double x2() { return this->find_numeric("x2"); }
        double y1() { return this->find_numeric("y1"); }
        double y2() { return this->find_numeric("y2"); }

        double width() override { return std::abs(x2() - x1()); }
        double height() override { return std::abs(y2() - y1()); }
        double length() { return std::sqrt(pow(width(), 2) + pow(height(), 2)); }
        double slope() { return (y2() - y1()) / (x2() - x1()); }
        double angle() { return atan(this->slope()) * RAD_TO_DEG; }

        std::pair<double, double> along(double percent);

    protected:
        Element::BoundingBox get_bbox() override;   
    };

    class Rect : public Shape {
    public:
        static constexpr ElementKind static_kind = ElementKind::Rect;
        Rect() = default;
        using Shape::Shape;
        ElementKind kind() const override { return static_kind; }

        Rect(
            double x, double y, double width, double height) :
            Shape({
                    { "x", to_string(x) },
                    { "y", to_string(y) },
                    { "width", to_string(width) },
                    { "height", to_string(height) }
            }) {};

        Element::BoundingBox get_bbox() override;
    };

    class Circle : public Shape {
    public:
        static constexpr ElementKind static_kind = ElementKind::Circle;
        Circle() = default;
        using Shape::Shape;
        ElementKind kind() const override { return static_kind; }

        Circle(double cx, double cy, double radius) :
                Shape({
                        { "cx", to_string(cx) },
                        { "cy", to_string(cy) },
                        { "r", to_string(radius) }
                }) {
        };

        Circle(std::pair<double, double> xy, double radius) : Circle(xy.first, xy.second, radius) {};
        double radius() { return this->find_numeric("r"); }
        virtual double x() override { return this->find_numeric("cx"); }
        virtual double y() override { return this->find_numeric("cy"); }
        virtual double width() override { return this->radius() * 2; }
        virtual double height() override { return this->width(); }
        Element::BoundingBox get_bbox() override;
    };

    class Polygon : public Element {
    public:
        static constexpr ElementKind static_kind = ElementKind::Polygon;
        Polygon() = default;
        using Element::Element;
        ElementKind kind() const override { return static_kind; }

        Polygon(const std::vector<Point>& points) {
            // Quick and dirty
            std::string point_str;
            for (auto& pt : points)
                point_str += to_string(pt) + " ";
            this->set_attr("points", point_str);
        };
    };

    inline Element::BoundingBox Line::get_bbox() {
        return { x1(), x2(), y1(), y2() };
    }

    inline Element::BoundingBox Rect::get_bbox() {
        double x = this->x(), y = this->y(),
            width = this->width(), height = this->height();
        return { x, x + width, y, y + height };
    }

    inline Element::BoundingBox Circle::get_bbox() {
        double x = this->x(), y = this->y(), radius = this->radius();

        return {
            x - radius,
            x + radius,
            y - radius,
            y + radius
        };
    }

    inline std::pair<double, double> Line::along(double percent) {
        /** Return the coordinates required to place an element along
         *   this line
         */

        double x_pos, y_pos;

        if (x1() != x2()) {
            double length = percent * this->length();
            double discrim = std::sqrt(4 * pow(length, 2) * (1 / (1 + pow(slope(), 2))));

            double x_a = (2 * x1() + discrim) / 2;
            double x_b = (2 * x1() - discrim) / 2;
            x_pos = x_a;

            if ((x_a > x1() && x_a > x2()) || (x_a < x1() && x_a < x2()))
                x_pos = x_b;

            y_pos = slope() * (x_pos - x1()) + y1();
        }
        else { // Edge case:: Completely vertical lines
            x_pos = x1();

            if (y1() > y2()) // Downward pointing
                y_pos = y1() - percent * this->length();
            else
                y_pos = y1() + percent * this->length();
        }

        return std::make_pair(x_pos, y_pos);
    }

    inline std::string Element::svg_to_string(const size_t indent_level) {
        /** Return the string representation of an SVG element
         *
         *  @param[out] indent_level The current level of indentation
         */
         
        auto indent = std::string(indent_level, '\t');
        std::string ret = indent + "<" + tag();

        // Set attributes
        for (auto& pair: attrs())
            ret += " " + pair.first + "=" + "\"" + escape_xml(pair.second) + "\"";

        if (!this->children.empty()) {
            ret += ">\n";

            // Recursively get strings for child elements
            for (auto& child : children) {
                // Avoid adding empty strings
                auto str = child->svg_to_string(indent_level + 1);
                if (str.size()) ret += str +"\n";
            }

            return ret += indent + "</" + tag() + ">";
        }

        return ret += " />";
    }

    inline std::string to_string(const std::map<std::string, AttributeMap>& css, const size_t indent_level) {
        /** Print out a CSS attribute block */
        auto indent = std::string(indent_level, '\t'), ret = std::string();
        for (auto& selector : css) {
            // Loop over each selector's attribute/value pairs
            ret += indent + "\t\t" + selector.first + " {\n";
            for (auto& attr : selector.second.attrs())
                ret += indent + "\t\t\t" + attr.first + ": " + attr.second + ";\n";
            ret += indent + "\t\t" + "}\n";
        }
        return ret;
    }

    inline std::string SVG::Style::svg_to_string(const size_t indent_level) {
        /** Create a CSS stylesheet */
        auto indent = std::string(indent_level, '\t');

        if (!this->css.empty() || !this->media_queries.empty() || !this->keyframes.empty()) {
            std::string ret = indent + "<style type=\"text/css\">\n" +
                indent + "\t<![CDATA[\n";

            // Begin CSS stylesheet
            ret += to_string(this->css, indent_level);

            // Media queries
            for (auto& media : this->media_queries) {
                ret += indent + "\t\t@media " + media.first + " {\n" +
                    to_string(media.second, indent_level + 1) +
                    indent + "\t\t" + "}\n";
            }

            // Animation frames
            for (auto& anim : this->keyframes) {
                ret += indent + "\t\t@keyframes " + anim.first + " {\n" +
                    to_string(anim.second, indent_level + 1) +
                    indent + "\t\t" + "}\n";
            }

            ret += indent + "\t]]>\n";
            return ret + indent + "</style>";
        }

        return "";
    }

    inline std::string Text::svg_to_string(const size_t indent_level) {
        auto indent = std::string(indent_level, '\t');
        std::string ret = indent + "<text";
        for (auto& pair: attrs())
            ret += " " + pair.first + "=" + "\"" + escape_xml(pair.second) + "\"";
        return ret += ">" + escape_xml(this->content) + "</text>";
    }

    inline void Element::autoscale(const double margin) {
        /** Like other autoscale() but accepts margin as a percentage */
        Element::BoundingBox bbox = this->get_bbox();
        this->get_bbox(bbox);
        double width = abs(bbox.x1) + abs(bbox.x2),
            height = abs(bbox.y1) + abs(bbox.y2);

        this->autoscale({
            width * margin, width * margin,
            height * margin, height * margin 
        });
    }

    inline void Element::autoscale(const Margins& margins) {
        /** Automatically set the width, height, and viewBox attribute of this item
         *  so that it can contain all of its children without clipping
         *
         *  @param[in] margins Extra margins for the sides
         */
        using std::stof;

        Element::BoundingBox bbox = this->get_bbox();
        this->get_bbox(bbox); // Compute the bounding box (recursive)
        double width = abs(bbox.x1) + abs(bbox.x2) + margins.x1 + margins.x2,
            height = abs(bbox.y1) + abs(bbox.y2) + margins.y1 + margins.y2,
            x1 = bbox.x1 - margins.x1, y1 = bbox.y1 - margins.y1;

        this->set_attr("width", width)
             .set_attr("height", height);

        if (x1 < 0 || y1 < 0) {
            std::stringstream viewbox;
            viewbox << std::fixed << std::setprecision(1)
                << x1 << " " // min-x
                << y1 << " " // min-y
                << width << " "
                << height;
            this->set_attr("viewBox", viewbox.str());
        }
    }

    inline void Element::get_bbox(Element::BoundingBox& box) {
        /** Recursively compute a bounding box */
        auto this_bbox = this->get_bbox();
        box = this_bbox + box; // Take union of both
        for (auto& child: this->children) child->get_bbox(box); // Recursion
    }

    inline Element::ChildMap Element::get_children() {
        /** Recursively compute all of the children of an SVG element */
        Element::ChildMap child_map;
        for (auto& child : this->get_children_helper())
            child_map[child->tag()].push_back(child);
        return child_map;
    }

    inline std::vector<Element*> Element::get_children_helper() {
        /** Helper function which populates a std::deque with all of an Element's children */
        std::deque<Element*> temp;
        std::vector<Element*> ret;

        for (auto& child : this->children) { temp.push_back(child.get()); }
        while (!temp.empty()) {
            ret.push_back(temp.front());
            for (auto& child : temp.front()->children) { temp.push_back(child.get()); }
            temp.pop_front();
        }

        return ret;
    };

    inline SVG merge(SVG& left, SVG& right, const Margins& margins) {
        /** Merge two SVG documents together horizontally with a uniform margin */
        SVG ret;

        // Move items
        ret << std::move(left) << std::move(right);

        // Set bounding box of individual pieces
        for (auto& svg_child: ret.get_immediate_children<SVG>())
            svg_child->autoscale(margins);

        // Set x position for child SVG elements, and compute width/height for this
        double x = 0, height = 0;
        for (auto& svg_child: ret.get_immediate_children<SVG>()) {
            svg_child->set_attr("x", x).set_attr("y", 0);
            x += svg_child->width();
            height = std::max(height, svg_child->height());
        }

        ret.set_attr("width", x).set_attr("height", height);
        return ret;
    }

    inline std::vector<Point> bounding_polygon(std::vector<Shape*>& shapes) {
        /* Convert shapes into sets of points, aggregate them, and then calculate
         * convex hull for aggregate set
         */
        std::vector<Point> points;
        for (auto& shp : shapes) {
            auto temp_points = shp->points();
            std::move(temp_points.begin(), temp_points.end(), std::back_inserter(points));
        }

        return util::convex_hull(points);
    }

    inline SVG merge(std::vector<SVG>& frames, const double width, const int max_frame_width) {
        /** Given a vector of SVGs, merge them together
         *  max_frame_width: Maximum width of any individual frame
         */
        SVG root;
        double x = 0, y = 0, total_width = 0, total_height = 0;
        for (auto& frame : frames) {
            // Scale
            frame.autoscale();
            if (frame.width() > max_frame_width) {
                const double scale_factor = max_frame_width/frame.width();
                frame.set_attr("width", max_frame_width);
                frame.set_attr("height", frame.height() * scale_factor); // Scale height proportionally
            }
        }

        // Move
        double current_height = 0;
        for (auto& frame : frames) {
            // Push to next row
            if ((x + frame.width()) > width) {
                total_width = std::max(total_width, x);
                x = 0;
                y += current_height;
                current_height = 0;
            }

            frame.set_attr("x", x).set_attr("y", y);
            x += frame.width();
            current_height = std::max(current_height, frame.height());
            root << std::move(frame);
        }

        total_height = y + current_height;

        // Set viewbox
        root.set_attr("viewBox") << 0 << " " << 0 << " " << total_width << " " << total_height;
        root.set_attr("width", total_width).set_attr("height", total_height);
        return root;
    }

    inline SVG frame_animate(std::vector<SVG>& frames, const double fps) {
        /** Given a vector of SVGs, create a frame-by-frame animation of them
         *
         *  @param[in]  A vector of frames (SVGs)
         *  @param[out] fps Numbers of frames per second
         */
        SVG root;
        const double duration = (double)frames.size() / fps; // [seconds]
        const double frame_step = 1.0 / fps; // duration of each frame [seconds]
        int current_frame = 0;

        root.style("svg.animated").set_attr("animation-iteration-count", "infinite")
            .set_attr("animation-timing-function", "step-end")
            .set_attr("animation-duration", std::to_string(duration) + "s")
            .set_attr("opacity", 0);

        // Move frames into new SVG
        for (auto& frame : frames) {
            std::string frame_id = "frame_" + std::to_string(current_frame);
            frame.set_attr("id", frame_id).set_attr("class", "animated");
            root.style("#" + frame_id).set_attr("animation-name",
                "anim_" + std::to_string(current_frame));
            current_frame++;
            root << std::move(frame);
        }

        // Set animation frames
        for (size_t i = 0, ilen = frames.size(); i < ilen; i++) {
            auto& anim = root.keyframes("anim_" + std::to_string(i));
            double begin_pct = (double)i / frames.size(),
                end_pct = (double)(i + 1) / frames.size();
            anim["0%"].set_attr("opacity", 0);
            anim[std::to_string(begin_pct * 100) + "%"].set_attr("opacity", 1);
            anim[std::to_string(end_pct * 100) + "%"].set_attr("opacity", 0);
        }

        // Scale and center child SVGs
        double width = 0, height = 0;

        for (auto& child : root.get_immediate_children<SVG>()) {
            child->autoscale();
            width = std::max(width, child->width());
            height = std::max(height, child->height());
        }

        root.set_attr("viewBox", "0 0 " + std::to_string(width) + " " + std::to_string(height));

        // Center child SVGs
        for (auto& child : root.get_immediate_children<SVG>())
            child->set_attr("x", (width - child->width())/2).set_attr("y", (height - child->height())/2);

        return root;
    }
}